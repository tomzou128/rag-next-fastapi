def parse_es_response_flexible(
    response: dict[str, any],
    include_metadata: bool = True,
    include_hits_metadata: bool = True,
    include_source: bool = True,
    include_highlight: bool = False,
    ignore_fields: list[str] | None = None,
) -> dict[str, any]:
    """
    辅助函数: 灵活地解析 Elasticsearch 返回结果，提取并结构化返回所需信息。

    Args:
        response: Elasticsearch 返回的原始响应字典.
        include_metadata: 是否包含顶层元数据 (took, timed_out, total, max_score)，默认为 True.
        include_hits_metadata: 是否包含 hits 数组中文档的元数据 (id, score)，默认为 True.
        include_source: 是否包含文档的 _source 源数据，默认为 True.
        include_highlight: 是否包含文档的 highlight 高亮信息，默认为 False.
        ignore_fields: 可选参数，指定要从 _source 中忽略的字段列表，默认为 None.

    Returns:
        结构化后的结果字典，包含根据 flag 参数选择的信息.
    """
    parsed_result = {}

    if include_metadata:
        parsed_result["took"] = response.get("took")
        parsed_result["timed_out"] = response.get("timed_out")
        parsed_result["total"] = response.get("hits", {}).get("total", {}).get("value")
        parsed_result["max_score"] = response.get("hits", {}).get("max_score")

    hits_data = []
    hits = response.get("hits", {}).get("hits", [])
    for h in hits:
        item = {}
        if include_hits_metadata:
            item["id"] = h.get("_id")
            item["score"] = h.get("_score")

        if include_source:
            source = h.get("_source", {}).copy()
            if ignore_fields:
                for field in ignore_fields:
                    source.pop(field, None)
            item["source"] = source

        if include_highlight and "highlight" in h:
            item["highlight"] = h.get("highlight")

        hits_data.append(item)

    parsed_result["hits"] = hits_data
    return parsed_result
