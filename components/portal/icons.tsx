/**
 * Portal icon system — maps portal icon ids to the shared `@/components/icons` library.
 * Do not introduce a second icon pack for the Student Portal.
 */

import {
  BellIcon,
  BookIcon,
  CalendarIcon,
  ChartIcon,
  ClipboardIcon,
  GridIcon,
  HomeIcon,
  LayersIcon,
  LogoutIcon,
  MedalIcon,
  MessageIcon,
  MoreIcon,
  PanelLeftIcon,
  RouteIcon,
  ShieldIcon,
  SparkIcon,
  TrophyIcon,
  UserIcon,
  UsersIcon,
} from "@/components/icons";

export const PORTAL_ICON_NAMES = [
  "home",
  "user",
  "users",
  "bell",
  "book",
  "calendar",
  "chart",
  "clipboard",
  "grid",
  "layers",
  "logout",
  "medal",
  "message",
  "more",
  "panel",
  "route",
  "shield",
  "spark",
  "trophy",
] as const;

export type PortalIconName = (typeof PORTAL_ICON_NAMES)[number];

type IconProps = {
  className?: string;
};

const PORTAL_ICON_MAP: Record<
  PortalIconName,
  React.ComponentType<IconProps>
> = {
  home: HomeIcon,
  user: UserIcon,
  users: UsersIcon,
  bell: BellIcon,
  book: BookIcon,
  calendar: CalendarIcon,
  chart: ChartIcon,
  clipboard: ClipboardIcon,
  grid: GridIcon,
  layers: LayersIcon,
  logout: LogoutIcon,
  medal: MedalIcon,
  message: MessageIcon,
  more: MoreIcon,
  panel: PanelLeftIcon,
  route: RouteIcon,
  shield: ShieldIcon,
  spark: SparkIcon,
  trophy: TrophyIcon,
};

export function PortalIcon({
  name,
  className = "size-5 shrink-0",
}: {
  name: PortalIconName;
  className?: string;
}) {
  const Icon = PORTAL_ICON_MAP[name];
  return <Icon className={className} />;
}
