"use client";

interface CrmRequest {
  method: string;
  endpoint: string;
  payload: unknown;
  timestamp: string;
}

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-sky-50 text-sky-700 border-sky-200",
  POST: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PATCH: "bg-amber-50 text-amber-700 border-amber-200",
  DELETE: "bg-rose-50 text-rose-700 border-rose-200",
};

export function CrmLog({ requests }: { requests: CrmRequest[] }) {
  if (requests.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-6 text-center text-xs text-stone-500">
        HubSpot request log is empty. Each pipeline run writes realistic
        payloads to this log.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-stone-900">
          Mock HubSpot request log
        </h3>
        <p className="text-xs text-stone-500">
          Latest {requests.length} simulated API calls. Payloads match the real
          HubSpot v3 REST API shape.
        </p>
      </div>
      <div className="max-h-96 divide-y divide-stone-100 overflow-y-auto">
        {requests.map((r, i) => (
          <div key={i} className="px-4 py-3">
            <div className="flex items-center gap-2">
              <span
                className={`rounded border px-1.5 py-0.5 text-[10px] font-mono font-semibold ${
                  METHOD_COLORS[r.method] || "bg-stone-50 text-stone-700 border-stone-200"
                }`}
              >
                {r.method}
              </span>
              <span className="font-mono text-xs text-stone-800">{r.endpoint}</span>
              <span className="ml-auto text-[10px] text-stone-400">
                {new Date(r.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <details className="mt-1.5">
              <summary className="cursor-pointer text-[11px] text-stone-500 hover:text-stone-700">
                payload
              </summary>
              <pre className="mt-1 overflow-x-auto rounded bg-stone-50 p-2 text-[11px] text-stone-700">
                {JSON.stringify(r.payload, null, 2)}
              </pre>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}
