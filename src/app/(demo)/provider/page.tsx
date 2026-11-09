import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { daysBetween, formatDateLong } from "@/core/time";
import { patientList, requireSession } from "@/db/queries";
import { PROVIDER_NAME } from "@/db/demo-data";

export default async function ProviderHome() {
  const session = await requireSession();
  const patients = await patientList(session.id);
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6">
      <div>
        <p className="text-sm text-muted-foreground">Signed in as {PROVIDER_NAME} (simulated)</p>
        <h1 className="text-2xl font-semibold tracking-tight">Upcoming visits</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sleep Snapshots</CardTitle>
          <CardDescription>Patients share their Snapshot before a visit. You only see what they approved.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Visit</TableHead>
                <TableHead className="hidden sm:table-cell">Nights logged</TableHead>
                <TableHead>Snapshot</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.map((p) => {
                const inDays = daysBetween(session.today, p.visitDate);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.name}
                      <span className="text-muted-foreground">, {p.age}</span>
                    </TableCell>
                    <TableCell>
                      {formatDateLong(p.visitDate)}
                      <span className="block text-xs text-muted-foreground">
                        {inDays === 0 ? "today" : inDays > 0 ? `in ${inDays} days` : "past"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{p.nightCount}</TableCell>
                    <TableCell>
                      {p.sharedAt ? <Badge>Shared</Badge> : <Badge variant="outline">Not shared yet</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      {p.sharedAt ? (
                        <Button asChild size="sm">
                          <Link href={`/provider/snapshot/${p.id}`}>Open</Link>
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" disabled>
                          Open
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
