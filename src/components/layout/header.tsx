
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Briefcase, LogOut, User, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { getNavLinksForRole } from '@/lib/nav-utils';
import { useState } from 'react';

export function Header() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  if (!user) {
    return null;
  }

  const handleLinkClick = () => {
    setIsSheetOpen(false);
  };

  const handleLogoutClick = () => {
    setIsSheetOpen(false);
    logout();
  };

  const accessibleGroups = getNavLinksForRole(user.role);

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b bg-background px-4 sticky top-0 z-50 md:justify-end">
        <div className="md:hidden">
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                    <Button variant="outline" size="icon">
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle navigation menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="flex flex-col p-0">
                    <nav className="grid gap-2 text-lg font-medium p-6 overflow-y-auto">
                        <Link href="/" onClick={handleLinkClick} className="flex items-center gap-2 text-lg font-semibold mb-4">
                            <Briefcase className="h-6 w-6 text-primary" />
                            <span>RecruitedAI</span>
                        </Link>
                        {accessibleGroups.map((group) => (
                          <div key={group.title} className="mb-4">
                             <h3 className="px-3 py-2 text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/5 rounded-sm mb-2">
                                {group.title}
                            </h3>
                             {group.links.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={handleLinkClick}
                                    className={cn(
                                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-all hover:text-primary',
                                        pathname === link.href && 'text-primary bg-muted'
                                    )}
                                >
                                    {link.icon}
                                    <span className="flex-1">{link.label}</span>
                                    {link.badge && <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/20">{link.badge}</Badge>}
                                </Link>
                            ))}
                          </div>
                        ))}
                    </nav>
                    <div className="mt-auto">
                        <div className="p-4 border-t space-y-1">
                            <Button variant="ghost" asChild className="w-full justify-start text-muted-foreground hover:text-primary hover:bg-muted">
                                <Link href="/profile" onClick={handleLinkClick}>
                                    <User className="h-5 w-5 mr-3" />
                                    Profile
                                </Link>
                            </Button>
                            <Button variant="ghost" asChild className="w-full justify-start text-muted-foreground hover:text-primary hover:bg-muted">
                                <Link href="/about" onClick={handleLinkClick}>
                                    <HelpCircle className="h-5 w-5 mr-3" />
                                    About Strategy
                                </Link>
                            </Button>
                            <Button variant="ghost" onClick={handleLogoutClick} className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-muted">
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
