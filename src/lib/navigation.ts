export type NavIcon =
  | "LayoutDashboard"
  | "FileText"
  | "AlertCircle"
  | "Building2"
  | "Database"
  | "Bot";

export type NavItem = {
  path: string;
  label: string;
  icon: NavIcon;
};

export type NavSection = {
  id: string;
  label: string;
  items: NavItem[];
};

export const navSections: NavSection[] = [
  {
    id: "operacao",
    label: "Operação",
    items: [
      { path: "/", label: "Dashboard", icon: "LayoutDashboard" },
      { path: "/documentos", label: "Aprovação", icon: "FileText" },
      { path: "/pendencias", label: "Pendências", icon: "AlertCircle" },
    ],
  },
  {
    id: "cadastro",
    label: "Cadastro",
    items: [
      { path: "/contabilidades", label: "Contabilidades", icon: "Building2" },
      { path: "/base-mestre", label: "Base Mestre", icon: "Database" },
    ],
  },
];

export const assistantNavItem: NavItem = {
  path: "/assistente",
  label: "Assistente",
  icon: "Bot",
};

export const navItems: NavItem[] = [
  ...navSections.flatMap((section) => section.items),
  assistantNavItem,
];
