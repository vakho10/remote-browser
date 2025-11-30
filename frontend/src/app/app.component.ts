import {Component} from '@angular/core';
import {RemoteBrowserComponent} from "./components/remote-browser.component/remote-browser.component";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RemoteBrowserComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
}
