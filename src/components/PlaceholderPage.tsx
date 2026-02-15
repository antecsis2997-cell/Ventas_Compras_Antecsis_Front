import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  subtitle: string;
}

export function PlaceholderPage({ title, subtitle }: PlaceholderPageProps) {
  return (
    <>
      <div className="page-header">
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>
      <div className="table-container flex flex-col items-center justify-center py-20">
        <Construction className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium text-foreground">En desarrollo</p>
        <p className="text-sm text-muted-foreground mt-1">Esta sección estará disponible próximamente</p>
      </div>
    </>
  );
}
