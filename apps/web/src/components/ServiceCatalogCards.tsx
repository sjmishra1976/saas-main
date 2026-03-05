"use client";

type ServiceCard = {
  title: string;
  body: string;
};

const TOOLTIP_MESSAGE =
  "Go To Orgnazation to select/create organization/services";

export default function ServiceCatalogCards({ cards }: { cards: ServiceCard[] }) {
  return (
    <>
      {cards.map((card) => (
        <div
          key={card.title}
          style={{
            background: "var(--card)",
            border: "1px solid var(--stroke)",
            padding: "1.1rem",
            borderRadius: "14px",
            minHeight: "150px",
            display: "grid",
            gap: "0.5rem"
          }}
        >
          <h3
            title={TOOLTIP_MESSAGE}
            style={{ margin: 0, cursor: "pointer" }}
            onClick={() => window.alert(TOOLTIP_MESSAGE)}
          >
            {card.title}
          </h3>
          <p style={{ margin: 0, color: "var(--muted)" }}>{card.body}</p>
        </div>
      ))}
    </>
  );
}
