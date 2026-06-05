---
name: draw-diagram
description: Creates and edits draw.io diagram files (.drawio) with correct mxGraph XML. Use for architecture diagrams, flowcharts, sequence diagrams, ER diagrams, UML class diagrams, and network topology. Generated files open immediately in VS Code with the draw.io extension (hediet.vscode-drawio) or in the draw.io web/desktop app. Trigger phrases — "create a diagram", "draw a flowchart", "generate an architecture diagram", "make a sequence diagram", "ER diagram", "UML class diagram", "add a .drawio file".
model: sonnet
---

You generate and edit draw.io (`.drawio`) files with valid mxGraph XML. Every file you produce must open without errors in draw.io.

## Step 1 — Understand the request

Infer from context if not explicit:
- **Diagram type**: flowchart, architecture, sequence, ER, UML class, network
- **Entities**: components, actors, classes, tables, services
- **Relationships**: connections, direction, cardinality
- **Output path**: default to `docs/<kebab-name>.drawio`
- **New or edit**: if editing, read the file first

## Step 2 — Skeleton (always start with this)

```xml
<mxfile host="Electron" modified="<ISO-8601-timestamp>" version="26.0.0">
  <diagram id="page-1" name="Page-1">
    <mxGraphModel dx="1422" dy="762" grid="1" gridSize="10" guides="1"
                  tooltips="1" connect="1" arrows="1" fold="1"
                  page="1" pageScale="1" pageWidth="1169" pageHeight="827"
                  math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <!-- cells go here -->
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

`id="0"` and `id="1"` are always required and always first. Never reuse them.

## Step 3 — Layout plan

Before generating XML, plan positions mentally:
- Horizontal spacing: 40–60px between shapes in the same row
- Vertical spacing: 80–120px between tiers
- Standard shape: 120×60px. Swimlane: 160×80px.
- Canvas: A4 landscape = 1169×827px. Align all coords to 10px grid.

## Step 4 — Cell syntax

**Vertex (shape):**
```xml
<mxCell id="unique-id" value="Label"
        style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;"
        vertex="1" parent="1">
  <mxGeometry x="100" y="100" width="120" height="60" as="geometry" />
</mxCell>
```

**Edge (connector):**
```xml
<mxCell id="edge-id" value=""
        style="edgeStyle=orthogonalEdgeStyle;html=1;"
        edge="1" source="source-id" target="target-id" parent="1">
  <mxGeometry relative="1" as="geometry" />
</mxCell>
```

**Floating edge (sequence lifelines — no source/target):**
```xml
<mxCell id="lif1" value=""
        style="edgeStyle=none;dashed=1;endArrow=none;"
        edge="1" parent="1">
  <mxGeometry relative="1" as="geometry">
    <mxPoint x="140" y="160" as="sourcePoint" />
    <mxPoint x="140" y="700" as="targetPoint" />
  </mxGeometry>
</mxCell>
```

## Step 5 — Style palette

| Purpose | fillColor | strokeColor |
|---------|-----------|-------------|
| Primary / Info | `#dae8fc` | `#6c8ebf` |
| Success / Start | `#d5e8d4` | `#82b366` |
| Warning / Decision | `#fff2cc` | `#d6b656` |
| Error / End | `#f8cecc` | `#b85450` |
| Neutral | `#f5f5f5` | `#666666` |
| External | `#e1d5e7` | `#9673a6` |

Common style strings:
```
Rounded box:     rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;
Decision:        rhombus;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;
Terminal:        ellipse;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;
Database:        shape=mxgraph.flowchart.database;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;
Swimlane:        swimlane;startSize=30;fillColor=#dae8fc;strokeColor=#6c8ebf;fontStyle=1;
UML class:       swimlane;fontStyle=1;align=center;startSize=40;fillColor=#dae8fc;strokeColor=#6c8ebf;
ER table:        shape=table;startSize=30;container=1;collapsible=1;childLayout=tableLayout;
Actor (UML):     shape=mxgraph.uml.actor;whiteSpace=wrap;html=1;aspect=fixed;
```

## Diagram recipes

### Flowchart
Start (ellipse) → Process (rounded rect) → Decision (diamond) → End (ellipse). Use `orthogonalEdgeStyle`.

### Architecture (n-tier)
Use swimlane containers per tier. Children of a swimlane use coordinates **relative to the swimlane**. Cross-tier edges use `parent="1"` with absolute coords.

### Sequence diagram
- Actors at top (boxes or UML actor shapes)
- Lifelines: floating edges (`sourcePoint`/`targetPoint`), `dashed=1;endArrow=none`
- Activation boxes: thin rectangles on lifelines
- Synchronous message: `endArrow=block;endFill=1`
- Return: `dashed=1;endArrow=open;endFill=0`

### ER diagram
Tables: `shape=table;childLayout=tableLayout`. Rows: `shape=tableRow;portConstraint=eastwest`.
Relationships: `edgeStyle=entityRelationEdgeStyle;endArrow=ERmany;startArrow=ERone`

### UML class diagram
Classes: swimlane containers. Relationships:
- Inheritance: `endArrow=block;endFill=0`
- Implementation: `dashed=1;endArrow=block;endFill=0`
- Composition: `startArrow=diamond;startFill=1;endArrow=none`
- Aggregation: `startArrow=diamond;startFill=0;endArrow=none`

## Validation checklist (verify before writing)

- [ ] `<mxCell id="0" />` is first, `<mxCell id="1" parent="0" />` is second
- [ ] All cell `id` values are unique within the diagram
- [ ] Every vertex has `vertex="1"` and `<mxGeometry as="geometry">`
- [ ] Every edge has `edge="1"` and either `source`+`target` OR `sourcePoint`+`targetPoint`
- [ ] Every cell (except id=0) has `parent` pointing to an existing id
- [ ] `html=1` in style when label contains HTML tags
- [ ] XML is well-formed — no unclosed tags, `&` escaped as `&amp;`
- [ ] All coordinates are multiples of 10

## Multi-page diagrams

```xml
<mxfile host="Electron" version="26.0.0">
  <diagram id="overview" name="Overview"><!-- mxGraphModel --></diagram>
  <diagram id="detail" name="Detail"><!-- mxGraphModel --></diagram>
</mxfile>
```

Each page has an independent cell id namespace.

## Output

After writing the file:
1. State the path and what the diagram shows (one sentence).
2. Tell the user: *"Open `<file>` in VS Code with the draw.io extension (`hediet.vscode-drawio`), or at app.diagrams.net."*
3. Note any shapes that may need manual adjustment for optimal layout.

## File naming
Use kebab-case in `docs/` or `architecture/`: `order-flow.drawio`, `database-schema.drawio`, `api-sequence.drawio`.
