import { Button } from "@/components/ui";

export default function Nav({ next, back, nextLabel = "Continue", nextDisabled }: { next?: () => void; back?: () => void; nextLabel?: string; nextDisabled?: boolean }) {
  return (
    <div className="mt-auto flex flex-col gap-2 pt-4">
      {next && <Button onClick={next} disabled={nextDisabled}>{nextLabel}</Button>}
      {back && <Button variant="secondary" onClick={back}>Back</Button>}
    </div>
  );
}
