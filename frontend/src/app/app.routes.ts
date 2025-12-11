import {Routes} from '@angular/router';
import {StartBrowserComponent} from './components/remote-browser/start-browser/start-browser.component';
import {RemoteBrowserComponent} from './components/remote-browser/remote-browser.component';
import {browserGuard} from './guards/browser.guard';

export const routes: Routes = [
  {path: '', component: StartBrowserComponent, pathMatch: 'full'},
  {path: 'browser', component: RemoteBrowserComponent, canActivate: [browserGuard]},
  {path: '**', redirectTo: ''}
];
