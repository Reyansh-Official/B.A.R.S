import { Button } from "@/components/ui";
import { useLang } from "@/lib/i18n";

export default function Nav({ next, back, nextLabel, nextDisabled }: { next?: () => void; back?: () => void; nextLabel?: string; nextDisabled?: boolean }) {
  const { tr } = useLang();
  return (
    <div className="mt-auto flex flex-col gap-2 pt-4">
      {next && <Button onClick={next} disabled={nextDisabled}>{nextLabel ?? tr("Continue", "Continuar")}</Button>}
      {back && <Button variant="secondary" onClick={back}>{tr("Back", "Atrás")}</Button>}
    </div>
  );
}
