import { Card, SectionHeading } from "@axyscare/ui-shared";

export function ModulePlaceholder({
  title,
  description,
  bullets,
}: {
  title: string;
  description: string;
  bullets: string[];
}) {
  return (
    <Card>
      <SectionHeading title={title} description={description} />
      <div className="stack">
        {bullets.map((bullet) => (
          <div key={bullet} className="list-row">
            <span>{bullet}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

