"use client";

import { useState } from "react";
import { ChevronRightIcon } from "@/components/dashboard/shell-icons";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { compactTokens, usd } from "@/lib/usage/format";
import type { TreeNode } from "@/lib/usage/types";
import { cn } from "@/lib/utils";

interface AttributionTreeProps {
  tree: TreeNode[];
  focus: TreeNode | null;
  onFocus: (node: TreeNode | null) => void;
}

/** Root-to-node label path, for the focus breadcrumb. Empty when not found. */
function pathTo(nodes: TreeNode[], target: TreeNode, trail: TreeNode[] = []): TreeNode[] {
  for (const n of nodes) {
    const next = [...trail, n];
    if (n.id === target.id) return next;
    const found = pathTo(n.children, target, next);
    if (found.length) return found;
  }
  return [];
}

interface RowProps {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  toggle: (id: string) => void;
  onFocus: (node: TreeNode) => void;
  focusedId: string | null;
}

function Row({ node, depth, expanded, toggle, onFocus, focusedId }: RowProps) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);

  return (
    <Collapsible open={isOpen} onOpenChange={() => hasChildren && toggle(node.id)}>
      <div
        className={cn(
          "grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-md py-1.5 pr-2 text-sm hover:bg-muted/50",
          focusedId === node.id && "bg-muted",
        )}
      >
        <div
          className="flex min-w-0 items-center gap-1"
          style={{
            paddingLeft: depth * 18,
          }}
        >
          {hasChildren ? (
            <CollapsibleTrigger
              className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
              aria-label={isOpen ? "Collapse" : "Expand"}
            >
              <ChevronRightIcon
                width={14}
                height={14}
                className={cn("transition-transform", isOpen && "rotate-90")}
              />
            </CollapsibleTrigger>
          ) : (
            <span className="size-5 shrink-0" />
          )}
          <button
            type="button"
            className="truncate text-left hover:text-accent-vivid"
            onClick={() => onFocus(node)}
            title={node.label}
          >
            {node.label}
          </button>
        </div>
        <span className="w-16 text-right tabular-nums text-muted-foreground">{node.calls}</span>
        <span className="w-20 text-right tabular-nums text-muted-foreground">
          {compactTokens(node.inputTokens + node.outputTokens)}
        </span>
        <span className="w-24 text-right font-medium tabular-nums">{usd(node.cost)}</span>
      </div>

      {hasChildren ? (
        <CollapsibleContent>
          {node.children.map((child) => (
            <Row
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              toggle={toggle}
              onFocus={onFocus}
              focusedId={focusedId}
            />
          ))}
        </CollapsibleContent>
      ) : null}
    </Collapsible>
  );
}

/**
 * Expandable cost-attribution tree (user → session → message → tool → call).
 * Cost / calls / tokens are pre-summed into each parent by `aggregate`; children
 * arrive sorted by cost desc. Expansion is tracked in a Set of node ids; clicking
 * a node label re-roots the page via `onFocus`. A breadcrumb shows the focused
 * path with a clear action.
 */
export function AttributionTree({ tree, focus, onFocus }: AttributionTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const breadcrumb = focus ? pathTo(tree, focus) : [];

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-foreground">Cost attribution</h2>
        {focus ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Focused:</span>
            {breadcrumb.map((n, i) => (
              <span key={n.id} className="flex items-center gap-1.5">
                {i > 0 ? <span className="text-faint">/</span> : null}
                <button
                  type="button"
                  className="hover:text-accent-vivid"
                  onClick={() => onFocus(n)}
                >
                  {n.label}
                </button>
              </span>
            ))}
            <button
              type="button"
              className="ml-1 rounded px-1.5 py-0.5 text-accent-vivid hover:bg-muted"
              onClick={() => onFocus(null)}
            >
              Clear
            </button>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 border-b border-border pb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        <span>Node</span>
        <span className="w-16 text-right">Calls</span>
        <span className="w-20 text-right">Tokens</span>
        <span className="w-24 text-right">Cost</span>
      </div>

      {tree.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No attributed usage.</p>
      ) : (
        <div>
          {tree.map((node) => (
            <Row
              key={node.id}
              node={node}
              depth={0}
              expanded={expanded}
              toggle={toggle}
              onFocus={onFocus}
              focusedId={focus?.id ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
