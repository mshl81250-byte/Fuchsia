import { Link } from "wouter";
import { User, Package, MapPin, Settings, LogOut, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Profile() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-serif font-bold text-foreground mb-8">حسابي</h1>
      
      <div className="bg-card border border-border rounded-2xl p-6 mb-8 shadow-sm flex items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
          <User className="w-10 h-10" />
        </div>
        <div className="flex flex-col">
          <h2 className="text-xl font-bold">ضيف مميز</h2>
          <p className="text-muted-foreground">عميل لمسة</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Link href="/orders" className="block">
          <div className="bg-card border border-border hover:border-primary transition-colors rounded-xl p-5 flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <Package className="w-6 h-6" />
              </div>
              <span className="font-bold text-lg">طلباتي السابقة</span>
            </div>
            <ChevronLeft className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </Link>

        <div className="bg-card border border-border hover:border-primary transition-colors rounded-xl p-5 flex items-center justify-between group cursor-pointer opacity-70">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
              <MapPin className="w-6 h-6" />
            </div>
            <span className="font-bold text-lg">العناوين المحفوظة</span>
          </div>
          <span className="text-xs bg-muted px-2 py-1 rounded">قريباً</span>
        </div>

        <div className="bg-card border border-border hover:border-primary transition-colors rounded-xl p-5 flex items-center justify-between group cursor-pointer opacity-70">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
              <Settings className="w-6 h-6" />
            </div>
            <span className="font-bold text-lg">الإعدادات</span>
          </div>
          <span className="text-xs bg-muted px-2 py-1 rounded">قريباً</span>
        </div>
      </div>

      <div className="mt-12 text-center">
        <Button variant="ghost" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
          <LogOut className="w-4 h-4 ml-2" />
          تسجيل الخروج
        </Button>
      </div>
    </div>
  );
}
