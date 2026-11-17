import { LogOut } from 'lucide-react';
import { Button } from '@/shared/ui';
import { logout } from '../actions/logout';

export function LogoutButton() {
  return (
    <form action={logout}>
      <Button type="submit" variant="text" icon={<LogOut aria-hidden />}>
        Sair
      </Button>
    </form>
  );
}
