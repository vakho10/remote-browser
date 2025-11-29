import {Component} from '@angular/core';
import {RemoteBrowserComponent} from "../../components/remote-browser.component/remote-browser.component";

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    RemoteBrowserComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {

}
