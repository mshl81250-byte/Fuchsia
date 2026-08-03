import { useAdminListUsers } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import { Users, Phone, Mail, Award, Clock } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export function CustomersView() {
  const { data: users = [], isLoading } = useAdminListUsers();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="w-full h-12 rounded-lg" />
        <Skeleton className="w-full h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">العملاء</h2>
      </div>

      <Card className="border shadow-sm overflow-hidden">
        {users.length === 0 ? (
          <Empty className="border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon"><Users /></EmptyMedia>
              <EmptyTitle>لا يوجد عملاء</EmptyTitle>
              <EmptyDescription>لم يقم أي عميل بالتسجيل بعد</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <Table dir="rtl">
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">معلومات التواصل</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">نقاط المكافآت</TableHead>
                  <TableHead className="text-right">تاريخ الانضمام</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium text-base">
                      {user.fullName || "بدون اسم"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                        {user.phone && (
                          <div className="flex items-center gap-2" dir="ltr">
                            <span>{user.phone}</span> <Phone className="w-3 h-3" /> 
                          </div>
                        )}
                        {user.email && (
                          <div className="flex items-center gap-2 justify-end" dir="ltr">
                            <span>{user.email}</span> <Mail className="w-3 h-3" /> 
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.isGuest ? (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-800">زائر</Badge>
                      ) : (
                        <Badge className="bg-primary/10 text-primary border-0 hover:bg-primary/20">مسجل</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-yellow-500" />
                        <span className="font-bold">{user.rewardPoints || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {format(new Date(user.createdAt || Date.now()), "dd MMM yyyy", { locale: ar })}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
