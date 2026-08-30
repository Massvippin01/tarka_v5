from .common import BaseSchema


class GraphNode(BaseSchema):
    id: str
    label: str
    properties: dict


class GraphEdge(BaseSchema):
    source: str
    target: str
    relationship: str


class GraphResponse(BaseSchema):
    nodes: list[GraphNode]
    edges: list[GraphEdge]