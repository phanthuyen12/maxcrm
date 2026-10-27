'use client';

import { MessageSquareText, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Topbar } from '@/components/layout/topbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StateView } from '@/components/state/state-view';
import { CreateTemplateDialog } from '@/components/templates/create-template-dialog';
import { useDeleteTemplate, useTemplates } from '@/hooks/use-templates';

export default function TemplatesPage() {
  const { data, isLoading, isError, refetch } = useTemplates();
  const deleteTemplate = useDeleteTemplate();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Topbar title="Mẫu tin nhắn" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mb-4 flex justify-end">
          <CreateTemplateDialog />
        </div>

        <StateView
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          isEmpty={!isLoading && !isError && (data?.length ?? 0) === 0}
          emptyIcon={<MessageSquareText className="h-6 w-6" />}
          emptyTitle="Chưa có mẫu tin nhắn"
          emptyDescription="Tạo mẫu trả lời nhanh để tiết kiệm thời gian chăm sóc khách hàng."
          loadingFallback={
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data?.map((template) => (
              <Card key={template.id}>
                <CardHeader className="flex-row items-start justify-between space-y-0">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{template.title}</p>
                    <Badge variant="secondary" className="mt-1">
                      {template.category}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      deleteTemplate.mutate(template.id, {
                        onSuccess: () => toast.success('Đã xóa mẫu tin nhắn'),
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{template.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </StateView>
      </div>
    </div>
  );
}
