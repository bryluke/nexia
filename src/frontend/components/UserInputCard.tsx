import { useState } from "preact/hooks";
import type { UserInputBlock } from "../../shared/content-blocks.ts";

interface Props {
  block: UserInputBlock;
  onRespond: (requestId: string, answers: Record<string, string>) => void;
}

export function UserInputCard({ block, onRespond }: Props) {
  const [selections, setSelections] = useState<Record<string, string>>({});

  const allAnswered = block.questions.every((q) => selections[q.question]);
  const isPending = block.status === "pending";

  const handleSelect = (question: string, label: string) => {
    if (!isPending) return;
    setSelections((prev) => ({ ...prev, [question]: label }));
  };

  const handleSubmit = () => {
    if (!allAnswered || !isPending) return;
    onRespond(block.id, selections);
  };

  return (
    <div class={`user-input-card${isPending ? "" : " answered"}`}>
      {block.questions.map((q) => {
        const selected = isPending ? selections[q.question] : block.answers?.[q.question];
        return (
          <div key={q.question} class="uiq-question">
            {q.header && <div class="uiq-header">{q.header}</div>}
            <div class="uiq-text">{q.question}</div>
            <div class="uiq-options">
              {q.options.map((opt) => {
                const isSelected = selected === opt.label;
                return (
                  <button
                    key={opt.label}
                    class={`uiq-option${isSelected ? " selected" : ""}`}
                    onClick={() => handleSelect(q.question, opt.label)}
                    disabled={!isPending}
                    type="button"
                  >
                    <span class="uiq-radio">{isSelected ? "\u25C9" : "\u25CB"}</span>
                    <span class="uiq-option-content">
                      <span class="uiq-label">{opt.label}</span>
                      {opt.description && (
                        <span class="uiq-desc">{opt.description}</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {isPending && (
        <div class="uiq-actions">
          <button
            class="uiq-submit"
            onClick={handleSubmit}
            disabled={!allAnswered}
            type="button"
          >
            Submit
          </button>
        </div>
      )}
    </div>
  );
}
