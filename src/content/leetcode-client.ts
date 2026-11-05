
import type { Difficulty, Submission } from "../types";

interface LeetCodeSubmissionDetails {
  code?: string;
  lang?: {
    name?: string;
    verboseName?: string;
  };
  runtime?: string;
  memory?: string;
  statusDisplay?: string;
  status_msg?: string;
  question?: {
    questionId?: string;
    title?: string;
    titleSlug?: string;
    difficulty?: string;
    topicTags?: Array<{ name?: string }>;
  };
}

interface SubmissionCheck {
  status_msg?: string;
  statusDisplay?: string;
  lang?: string;
  runtime?: string;
  memory?: string;
}

interface GraphQLError {
  message?: string;
}

interface SubmissionDetailsResponse {
  data?: {
    submissionDetails?: LeetCodeSubmissionDetails | null;
  };
  errors?: GraphQLError[];
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `LeetCode request failed (${response.status} ${response.statusText})`,
    );
  }

  return response.json() as Promise<T>;
}

function difficulty(value?: string): Difficulty {
  if (value === "Easy" || value === "Medium" || value === "Hard") {
    return value;
  }

  return "Unknown";
}

function getSubmissionStatus(check?: SubmissionCheck): string {
  return String(check?.status_msg ?? check?.statusDisplay ?? "").trim();
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkAcceptedSubmission(
  submissionId: string,
): Promise<SubmissionCheck> {
  const maxAttempts = 15;
  const delayMs = 1000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const check = await fetchJson<SubmissionCheck>(
      `https://leetcode.com/submissions/detail/${encodeURIComponent(
        submissionId,
      )}/check/`,
    );

    const status = getSubmissionStatus(check);

    if (/accepted/i.test(status)) {
      return check;
    }

    if (
      /wrong answer|runtime error|time limit|compile error|memory limit|output limit|internal error/i.test(
        status,
      )
    ) {
      throw new Error(`Submission was not accepted: ${status}`);
    }

    if (attempt < maxAttempts) {
      await wait(delayMs);
    }
  }

  throw new Error(
    `Could not confirm Accepted status for submission ${submissionId}.`,
  );
}

async function fetchSubmissionDetails(
  submissionId: string,
  titleSlug: string,
): Promise<LeetCodeSubmissionDetails> {
  const numericSubmissionId = Number(submissionId);

  if (
    !Number.isSafeInteger(numericSubmissionId) ||
    numericSubmissionId <= 0
  ) {
    throw new Error(
      `Invalid or unsafe submission ID: ${submissionId}.`,
    );
  }

  const query = `
    query submissionDetails($submissionId: Int!) {
      submissionDetails(submissionId: $submissionId) {
        code
        runtime
        memory
        statusDisplay
        lang {
          name
          verboseName
        }
        question {
          questionId
          title
          titleSlug
          difficulty
          topicTags {
            name
          }
        }
      }
    }
  `;

  const response = await fetch("https://leetcode.com/graphql/", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Referer: `https://leetcode.com/problems/${titleSlug}/`,
    },
    body: JSON.stringify({
      operationName: "submissionDetails",
      query,
      variables: {
        submissionId: numericSubmissionId,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Unable to retrieve submitted code (${response.status} ${response.statusText}).`,
    );
  }

  const payload =
    (await response.json()) as SubmissionDetailsResponse;

  if (payload.errors?.length) {
    const messages = payload.errors
      .map((error) => error.message)
      .filter((message): message is string => Boolean(message))
      .join("; ");

    throw new Error(
      `LeetCode GraphQL error: ${messages || "Unknown GraphQL error"}`,
    );
  }

  const detail = payload.data?.submissionDetails;

  if (!detail) {
    throw new Error(
      "LeetCode did not return submission details. Its private API may have changed.",
    );
  }

  return detail;
}

export async function getAcceptedSubmission(
  submissionId: string,
  titleSlug: string,
): Promise<Submission> {
  if (!submissionId || !titleSlug) {
    throw new Error("Submission ID and problem slug are required.");
  }

  // Step 1: Confirm Accepted status.
  const check = await checkAcceptedSubmission(submissionId);

  // Step 2: Retrieve submission details.
  const detail = await fetchSubmissionDetails(
    submissionId,
    titleSlug,
  );

  // Step 3: Validate source code explicitly.
  const code = detail.code;

  if (typeof code !== "string" || code.trim().length === 0) {
    throw new Error(
      "LeetCode did not return valid submitted source code.",
    );
  }

  // Step 4: Prepare problem details.
  const question = detail.question;
  const finalTitleSlug = question?.titleSlug || titleSlug;

  const language =
    detail.lang?.name ||
    detail.lang?.verboseName ||
    check.lang ||
    "unknown";

  const title =
    question?.title ||
    document.title.replace(" - LeetCode", "").trim() ||
    finalTitleSlug;

  return {
    submissionId,

    problemId: question?.questionId
      ? Number(question.questionId)
      : undefined,

    title,
    titleSlug: finalTitleSlug,

    difficulty: difficulty(question?.difficulty),

    language,

    // code is now guaranteed to be a string.
    code,

    topics: (question?.topicTags ?? [])
      .map((tag) => tag.name ?? "")
      .filter(Boolean),

    runtime: detail.runtime || check.runtime,
    memory: detail.memory || check.memory,

    submittedAt: Date.now(),
  };
}
