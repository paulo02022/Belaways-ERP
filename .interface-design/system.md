# Belaways Intelligence UI System

## Direction

Operational catalog workspace: compact, calm, precise, and visibly connected to the source data. The interface should feel like a well-kept stock bench, not a promotional dashboard.

## Visual System

- Depth: quiet borders and small tonal shifts; no decorative shadows or gradients.
- Spacing: 4px base unit; 12-20px inside operational surfaces; 20-28px between major groups.
- Radius: 6px controls, 8px panels and tables.
- Typography: Segoe UI Variable/Aptos stack; 14px operational body, 12px metadata, 24px page titles; weight and color establish hierarchy.
- Palette: zinc work surfaces, Belaways purple only for identity/actions, emerald for healthy stock, amber for attention, red for blocked states, sky for informational coverage.
- Motion: 100-180ms color/opacity feedback; no motion for repeated navigation; respect reduced motion.

## Signature

The catalog pulse is a compact status band combining last synchronization, coverage, stock health, and update feedback. Reuse this pattern wherever data freshness materially affects decisions.

## Components

- Primary button: 44px high, 6px radius, solid brand border/fill, semibold label.
- Secondary button/input/select: 44px high, 6px radius, quiet zinc border, inset tonal input surface.
- Table: sticky 40px header, 40 rows per server-paginated page, compact metadata, stable image cells.
- Status badge: compact 4px radius with text plus semantic color; never color alone for important states.
- Panels: 8px radius, 1px quiet border, no nesting of decorative cards.

## Product Rules

- Keep the sidebar navigation model and group it by operation versus administration.
- Preserve catalog filters and pagination in the URL.
- Show source freshness near the work, not buried in settings.
- Never fetch or render the complete product catalog for an interactive list.
- Prefer exception queues and operational totals over interchangeable metric cards.
