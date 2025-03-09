"""
RAG service for generating answers using the OpenAI API with retrieved context.
"""

import logging
from typing import List, Dict, Any, Optional, AsyncGenerator, Tuple

import tiktoken
from fastapi import Request
from openai import AsyncOpenAI

from app.config import settings
from app.schemas.rag import SearchType, RAGResponse, Citation
from app.services.search_service import SearchService

logger = logging.getLogger(__name__)


class RAGService:
    """
    Retrieval Augmented Generation service using OpenAI.

    This service:
    1. Retrieves relevant context from the search service
    2. Constructs a prompt with the retrieved context
    3. Generates an answer using OpenAI's GPT-4o
    4. Extracts citations from the generated answer
    """

    def __init__(self, search_service: SearchService):
        """
        Initialize the RAG service.

        Args:
            search_service: Service for retrieving context documents
        """
        self.search_service = search_service

        # Initialize OpenAI client
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

        # Initialize tokenizer for counting tokens
        self.tokenizer = tiktoken.encoding_for_model(settings.OPENAI_MODEL_NAME)

        logger.info(f"RAG service initialized with model: {settings.OPENAI_MODEL_NAME}")

    def _format_context(self, search_results: dict[str, Any]) -> str:
        """
        Format search results into context for the prompt.

        Args:
            search_results: List of search results from search service

        Returns:
            Formatted context string
        """
        context_parts = []

        for i, result in enumerate(search_results["hits"]):
            context_part = (
                f"[{i+1}] From document: '{result["source"]['filename']}', "
                f"Page: {result["source"]['page_number']}\n"
                f"{result["source"]['text']}\n"
            )
            context_parts.append(context_part)

        return "\n".join(context_parts)

    def _create_rag_prompt(self, query: str, context: str) -> Tuple[str, str]:
        """
        Create a prompt for the RAG model.

        Args:
            query: User query
            context: Formatted context from search results

        Returns:
            Complete prompt for the RAG model
        """
        # System prompt that instructs the model on how to respond
        system_prompt = """
        You are a helpful assistant that provides accurate answers based on the provided document context.

        Important instructions:
        1. Answer ONLY based on the provided context. If the context doesn't contain the answer, say "I don't have enough information to answer this question."
        2. For each piece of information you use, cite the source using the number in square brackets, e.g., [1], [2], etc.
        3. Do not make up or infer information that is not in the context.
        4. Keep your answers concise and to the point.
        5. If appropriate, you can combine information from multiple sources.
        """

        # User prompt with the query and context
        user_prompt = f"""
        Please answer the following question based on the provided context:

        Question: {query}

        Context:
        {context}
        """

        return system_prompt, user_prompt

    def _extract_citations(
        self, answer: str, search_results: dict[str, Any]
    ) -> Tuple[str, List[Citation]]:
        """
        Extract citation information from the generated answer and reorder markers sequentially.

        Args:
            answer: Generated answer with citation markers
            search_results: Original search results used for generation

        Returns:
            Tuple of (cleaned answer with reordered citation markers, list of citations)
        """
        import re

        # Find all citation markers and their positions in the text
        marker_positions = [
            (m.start(), m.group(1)) for m in re.finditer(r"\[(\d+)\]", answer)
        ]

        # If no citations found, return original answer
        if not marker_positions:
            return answer, []

        # Get the search result sources
        search_sources = [hit["source"] for hit in search_results.get("hits", [])]

        # Track citations and their new indices
        unique_markers = []
        citations = []
        marker_to_new_index = {}  # Maps original marker to new sequential index

        # Process markers in order of appearance
        for _, marker in marker_positions:
            if marker not in marker_to_new_index:
                try:
                    idx = int(marker) - 1

                    if idx >= 0 and idx < len(search_sources):
                        result_source = search_sources[idx]

                        # Add to tracking
                        unique_markers.append(marker)
                        new_index = len(unique_markers)
                        marker_to_new_index[marker] = new_index

                        # Create citation
                        citations.append(
                            Citation(
                                document_id=result_source["document_id"],
                                filename=result_source["filename"],
                                marker=f"[{new_index}]",
                                page_number=result_source["page_number"],
                                text=result_source["text"],
                            )
                        )
                    else:
                        logger.warning(
                            f"Citation marker [{marker}] refers to a non-existent search result"
                        )
                except (ValueError, IndexError) as e:
                    logger.warning(f"Invalid citation marker: [{marker}] - {str(e)}")

        # Replace all citation markers in reverse order to preserve positions
        new_answer = answer
        for pos, marker in sorted(marker_positions, reverse=True):
            if marker in marker_to_new_index:
                new_index = marker_to_new_index[marker]
                new_marker = f"[{new_index}]"
                new_answer = (
                    new_answer[:pos] + new_marker + new_answer[pos + len(marker) + 2 :]
                )

        return new_answer, citations

    async def generate_answer(
        self,
        query: str,
        search_type: SearchType = SearchType.HYBRID,
        top_k: int = 5,
        document_ids: list[str] | None = None,
    ) -> RAGResponse:
        """
        Generate an answer using RAG approach.

        Args:
            query: User query
            search_type: Type of search to perform
            top_k: Number of context documents to use
            document_ids: Optional list of document IDs to restrict search

        Returns:
            RAG response with answer and citations
        """
        try:
            # Retrieve relevant context
            search_results = await self.search_service.rag_context_query(
                query=query,
                search_type=search_type,
                document_ids=document_ids,
                page_size=top_k,
            )

            if not search_results:
                # No context found
                return RAGResponse(
                    answer="I couldn't find any relevant information to answer your question.",
                    citations=[],
                    query=query,
                )

            # Format context and create prompt
            context = self._format_context(search_results)
            system_prompt, user_prompt = self._create_rag_prompt(query, context)

            # Call OpenAI API
            response = await self.client.chat.completions.create(
                model=settings.OPENAI_MODEL_NAME,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.3,  # Lower temperature for more factual responses
                max_tokens=1000,
            )

            # Extract answer
            answer = response.choices[0].message.content
            answer, citations = self._extract_citations(answer, search_results)
            rag_response = RAGResponse(answer=answer, citations=citations, query=query)

            return rag_response
        except Exception as e:
            logger.error(f"Error generating RAG answer: {str(e)}")
            raise

    async def generate_streaming_answer(
        self,
        query: str,
        search_type: SearchType = SearchType.HYBRID,
        top_k: int = 5,
        document_ids: Optional[List[str]] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Generate a streaming answer using RAG approach.

        Args:
            query: User query
            search_type: Type of search to perform
            top_k: Number of context documents to use
            document_ids: Optional list of document IDs to restrict search

        Yields:
            Streamed parts of the answer and final citations
        """
        try:
            # Retrieve relevant context
            search_results = await self.search_service.rag_context_query(
                query=query,
                search_type=search_type,
                page_size=top_k,
                document_ids=document_ids,
            )

            if not search_results:
                # No context found
                yield {
                    "type": "answer",
                    "content": "I couldn't find any relevant information to answer your question.",
                }
                return

            # Format context and create prompt
            context = self._format_context(search_results)
            system_prompt, user_prompt = self._create_rag_prompt(query, context)

            # Call OpenAI API with streaming
            stream = await self.client.chat.completions.create(
                model=settings.OPENAI_MODEL_NAME,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.3,
                max_tokens=1000,
                stream=True,
            )

            # Collect the full answer for citation extraction at the end
            full_answer = ""

            # Stream the answer chunks
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    full_answer += content

                    yield {"type": "answer", "content": content}

            # Extract and send citations after the answer is complete
            full_answer, citations = self._extract_citations(
                full_answer, search_results
            )

            yield {
                "type": "citations",
                "content": full_answer,
                "citations": [
                    citation.model_dump(by_alias=True) for citation in citations
                ],
            }

        except Exception as e:
            logger.error(f"Error generating streaming RAG answer: {str(e)}")
            yield {"type": "error", "content": f"Error generating answer: {str(e)}"}


def get_rag_service(request: Request) -> RAGService:
    return request.app.state.rag_service
