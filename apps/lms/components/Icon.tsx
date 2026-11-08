import { ICON_PATHS, type IconName } from "./icons.generated";

/**
 * Material Symbols Outlined as inline SVG (design.md §9). Decorative by
 * default (aria-hidden); pass `label` when the icon carries meaning on its own.
 */
export function Icon({
  name,
  size = 20,
  label,
}: {
  name: IconName;
  size?: number;
  label?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 -960 960 960"
      fill="currentColor"
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
      focusable="false"
      style={{ flexShrink: 0 }}
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
