from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class DocumentInfo(BaseModel):
    id: str
    size: int
    last_modified: str
    filename: str
    content_type: str
    metadata: dict

    model_config = ConfigDict(
        alias_generator=to_camel,  # 使用下划线命名 -> 驼峰命名函数来自动生成别名
        populate_by_name=True,  # 允许通过字段名称或别名来赋值
    )
