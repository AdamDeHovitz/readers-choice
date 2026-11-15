"use client";

import type { ConnectedApp } from "@readers-choice/contract/connected-apps";
import { revokeConnectedApp } from "@/app/actions/connected-apps";
import { useAction } from "@/hooks/use-action";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { LocalDate } from "@/components/ui/local-date";

function accessLabel(scope: string): string {
  const scopes = scope.split(" ");
  if (scopes.includes("admin")) return "Can make changes, as admin";
  return scopes.includes("write") ? "Can make changes" : "Read only";
}

/** Apps connected through the MCP server, each with a Disconnect button. */
export function ConnectedApps({ apps }: { apps: ConnectedApp[] }) {
  const revoke = useAction(revokeConnectedApp);

  if (apps.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No apps are connected.</p>
    );
  }

  return (
    <div className="space-y-3">
      {revoke.error && <Alert variant="destructive">{revoke.error}</Alert>}
      <ul className="divide-border divide-y">
        {apps.map((app) => (
          <li
            key={app.grantId}
            className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{app.clientName}</p>
              <p className="text-dark-500 truncate text-xs">
                {app.clientHost ? `${app.clientHost} · ` : ""}
                {accessLabel(app.scope)}
                {" · last used "}
                <LocalDate iso={app.lastUsedAt} format="date" />
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={revoke.pending}
              onClick={() => revoke.run({ grantId: app.grantId })}
            >
              Disconnect
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
