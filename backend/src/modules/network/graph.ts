export type GraphNode = { id: string; role?: string | null };
export type GraphEdge = { id: string; source_asset_id: string; target_asset_id: string; functional?: boolean | null };

function adjacency(nodes: GraphNode[], edges: GraphEdge[], omittedNode?: string, omittedEdge?: string) {
  const valid = new Set(nodes.map((node) => node.id).filter((id) => id !== omittedNode));
  const graph = new Map<string, Set<string>>([...valid].map((id) => [id, new Set<string>()]));
  for (const edge of edges) {
    if (edge.id === omittedEdge || edge.functional === false || !valid.has(edge.source_asset_id) || !valid.has(edge.target_asset_id)) continue;
    graph.get(edge.source_asset_id)?.add(edge.target_asset_id);
    graph.get(edge.target_asset_id)?.add(edge.source_asset_id);
  }
  return graph;
}

export function impactedByFailure(nodes: GraphNode[], edges: GraphEdge[], failedNode?: string, failedEdge?: string): string[] {
  const gateways = nodes.filter((node) => /WAN|INTERNET/i.test(node.role ?? '')).map((node) => node.id);
  if (!gateways.length) return [];
  const graph = adjacency(nodes, edges, failedNode, failedEdge);
  const reachable = new Set<string>();
  const queue = gateways.filter((id) => graph.has(id));
  while (queue.length) {
    const current = queue.shift()!;
    if (reachable.has(current)) continue;
    reachable.add(current);
    for (const neighbor of graph.get(current) ?? []) if (!reachable.has(neighbor)) queue.push(neighbor);
  }
  return [...graph.keys()].filter((id) => !reachable.has(id)).sort();
}

export function articulationPoints(nodes: GraphNode[], edges: GraphEdge[]): string[] {
  const graph = adjacency(nodes, edges);
  const discovery = new Map<string, number>();
  const low = new Map<string, number>();
  const parent = new Map<string, string | null>();
  const points = new Set<string>();
  let time = 0;
  const visit = (node: string) => {
    discovery.set(node, ++time);
    low.set(node, time);
    let children = 0;
    for (const next of graph.get(node) ?? []) {
      if (!discovery.has(next)) {
        children++;
        parent.set(next, node);
        visit(next);
        low.set(node, Math.min(low.get(node)!, low.get(next)!));
        if (parent.get(node) === null && children > 1) points.add(node);
        if (parent.get(node) !== null && low.get(next)! >= discovery.get(node)!) points.add(node);
      } else if (next !== parent.get(node)) low.set(node, Math.min(low.get(node)!, discovery.get(next)!));
    }
  };
  for (const node of graph.keys()) if (!discovery.has(node)) { parent.set(node, null); visit(node); }
  return [...points].sort();
}
