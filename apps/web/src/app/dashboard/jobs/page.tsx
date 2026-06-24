'use client';

import { useJobs } from '@deseo/api-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@deseo/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@deseo/ui/table';
import { Badge } from '@deseo/ui/badge';
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';

const statusMap = {
  pending: { label: 'Pending', icon: Clock, class: 'bg-slate-100 text-slate-700' },
  running: { label: 'Running', icon: Loader2, class: 'bg-blue-100 text-blue-700 animate-pulse' },
  completed: { label: 'Completed', icon: CheckCircle2, class: 'bg-green-100 text-green-700' },
  failed: { label: 'Failed', icon: XCircle, class: 'bg-red-100 text-red-700' },
};

const typeMap = {
  article_generation: 'Article Generation',
  seo_optimization: 'SEO Optimization',
  keyword_research: 'Keyword Research',
};

export default function JobsPage() {
  const { data: jobs, isLoading } = useJobs();

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Background Jobs</h1>
        <p className="text-slate-500">Monitor the progress of your automated SEO workflows.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Track the execution of Temporal workflows.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Workflow ID</TableHead>
                <TableHead>Started</TableHead>
                <TableHead className="text-right">Completed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs?.map((job) => {
                const status = statusMap[job.status as keyof typeof statusMap] || statusMap.pending;
                const Icon = status.icon;
                return (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">
                      {typeMap[job.type as keyof typeof typeMap] || job.type}
                    </TableCell>
                    <TableCell>
                      <Badge className={`flex w-fit items-center gap-1.5 ${status.class}`}>
                        <Icon className="h-3 w-3" />
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">
                      {job.temporalWorkflowId || 'N/A'}
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {new Date(job.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-slate-500 text-sm">
                      {job.status === 'completed' || job.status === 'failed' ? new Date(job.updatedAt).toLocaleString() : '-'}
                    </TableCell>
                  </TableRow>
                );
              })}

              {(!jobs || jobs.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                    No background jobs found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
