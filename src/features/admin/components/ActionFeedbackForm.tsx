"use client";

import { useRouter } from "next/navigation";
import {
  type FormEvent,
  type ReactNode,
  useRef,
  useState,
  useTransition,
} from "react";

import styles from "../styles/AdminPanel.module.css";

type ActionFeedbackTone = "error" | "idle" | "pending" | "success";

type ActionFeedbackState = {
  message: string;
  tone: ActionFeedbackTone;
};

type ServerFormAction = (formData: FormData) => Promise<void>;

export function ActionFeedbackForm({
  action,
  children,
  className,
  pendingMessage = "Saving...",
  refreshOnSuccess = false,
  resetOnSuccess = false,
  successMessage = "Saved.",
}: {
  action: ServerFormAction;
  children: ReactNode;
  className: string;
  pendingMessage?: string;
  refreshOnSuccess?: boolean;
  resetOnSuccess?: boolean;
  successMessage?: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [isRefreshing, startRefresh] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<ActionFeedbackState>({
    message: "",
    tone: "idle",
  });
  const isBusy = isSubmitting || isRefreshing;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isBusy) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const submitter = (event.nativeEvent as SubmitEvent).submitter;

    if (isNamedSubmitControl(submitter)) {
      formData.set(submitter.name, submitter.value);
    }

    setIsSubmitting(true);
    setFeedback({ message: pendingMessage, tone: "pending" });

    try {
      await action(formData);
      if (resetOnSuccess) formRef.current?.reset();
      setFeedback({ message: successMessage, tone: "success" });
      if (refreshOnSuccess) {
        startRefresh(() => router.refresh());
      }
    } catch (error) {
      setFeedback({
        message: errorMessage(error),
        tone: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      ref={formRef}
      aria-busy={isBusy}
      className={className}
      data-pending={isBusy}
      onSubmit={handleSubmit}
    >
      {children}
      {feedback.message ? (
        <p className={styles.actionFeedback} data-tone={feedback.tone}>
          {feedback.message}
        </p>
      ) : null}
    </form>
  );
}

function isNamedSubmitControl(
  submitter: EventTarget | null,
): submitter is HTMLButtonElement | HTMLInputElement {
  return (
    (submitter instanceof HTMLButtonElement ||
      submitter instanceof HTMLInputElement) &&
    Boolean(submitter.name)
  );
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;

  return "Action failed.";
}
