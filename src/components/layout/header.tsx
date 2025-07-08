'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Briefcase, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { getNavLinksForRole } from '@/lib/nav-utils';

export function Header() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  const accessibleGroups = getNavLinksForRole(user.role);

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b bg-background px-4 sticky top-0 z-50 md:justify-end">
        <div className="md:hidden">
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="outline" size="icon">
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle navigation menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="flex flex-col">
                    <nav className="grid gap-2 text-lg font-medium">
                        <Link href="/" className="flex items-center gap-2 text-lg font-semibold mb-4">
                            <Briefcase className="h-6 w-6 text-primary" />
                            <span>RecruitedAI</span>
                        </Link>
                        {accessibleGroups.map((group) => (
                          <div key={group.title}>
                             <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                {group.title}
                            </h3>
                             {group.links.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={cn(
                                        'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                                        pathname === link.href && 'text-primary bg-muted'
                                    )}
                                >
                                    {link.icon}
                                    <span className="flex-1">{link.label}</span>
                                    {link.badge && <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">{link.badge}</Badge>}
                                </Link>
                            ))}
                          </div>
                        ))}
                    </nav>
                    <div className="mt-auto">
                        <div className="mt-auto p-4 border-t space-y-1">
                            <Button variant="ghost" asChild className="w-full justify-start text-muted-foreground hover:text-primary hover:bg-muted">
                                <Link href="/profile">
                                    <User className="h-5 w-5 mr-3" />
                                    Profile
                                </Link>
                            </Button>
                            <Button variant="ghost" onClick={logout} className="w-full justify-start text-muted-foreground hover:text-primary hover:bg-muted">
                                <LogOut className="h-5 w-5 mr-3" />
                                Log Out
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    </header>
  );
}
