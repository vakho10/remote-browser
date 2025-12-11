import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';
import {WebSocketService} from '../services/websocket.service';
import {catchError, map, of, timeout} from 'rxjs';

export const browserGuard: CanActivateFn = (route, state) => {
  const ws = inject(WebSocketService);
  const router = inject(Router);

  // Ensure the connection is active
  ws.activate();

  return ws.getBrowserAlive().pipe(
    map(alive => {
      if (alive) {
        return true;
      } else {
        return router.createUrlTree(['/']);
      }
    }),
    timeout(5000), // Failsafe timeout
    catchError(() => {
      return of(router.createUrlTree(['/']));
    })
  );
};
