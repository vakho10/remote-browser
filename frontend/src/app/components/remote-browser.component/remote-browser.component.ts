import {AfterViewInit, Component, ElementRef, inject, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {WebSocketService} from "../../services/websocket.service";
import {AsyncPipe} from "@angular/common";
import {FormsModule} from "@angular/forms";
import {debounceTime, fromEvent, Subject, Subscription, throttleTime} from "rxjs";

@Component({
  selector: 'app-remote-browser',
  standalone: true,
  imports: [AsyncPipe, FormsModule],
  templateUrl: './remote-browser.component.html',
  styleUrl: './remote-browser.component.scss'
})
export class RemoteBrowserComponent implements OnInit, AfterViewInit, OnDestroy {

  webSocketService = inject(WebSocketService);
  currentUrl: string | null = null;
  inputFieldUrl = "";
  private resizeObserver?: ResizeObserver;
  private resizeSubject = new Subject<ResizeObserverEntry>();

  @ViewChild('content', {static: true})
  content!: ElementRef;

  private wheelSub?: Subscription;

  ngOnInit() {
    this.webSocketService.activate();

    this.resizeObserver = new ResizeObserver(entries => {
      entries.forEach(entry => this.resizeSubject.next(entry));
    });
    this.resizeObserver.observe(this.content.nativeElement);

    // Only emit the last size after 200ms of no new resize events
    this.resizeSubject.pipe(
      debounceTime(200)
    ).subscribe(entry => {
      this.resizeTo(entry.contentRect.width, entry.contentRect.height);
    });
  }

  ngAfterViewInit() {
    this.wheelSub = fromEvent<WheelEvent>(this.content.nativeElement, 'wheel')
      .pipe(
        throttleTime(100) // only emit once every 100ms
      )
      .subscribe(event => {
        event.preventDefault(); // prevent local scrolling

        if (event.deltaY < 0) {
          this.webSocketService.scrollUp();
        } else if (event.deltaY > 0) {
          this.webSocketService.scrollDown();
        }
      });
  }

  connectToWebsite() {
    this.webSocketService.connectToWebsite(this.inputFieldUrl);
    this.currentUrl = this.inputFieldUrl
  }

  ngOnDestroy() {
    this.webSocketService.deactivate();
    this.resizeObserver?.disconnect();
    this.resizeSubject.complete();
    this.wheelSub?.unsubscribe();
  }

  resizeTo(width: number, height: number) {
    this.webSocketService.resizeTo(width, height);
  }

  goBack() {

  }

  goForward() {

  }

  refreshPage() {
    if (!this.currentUrl) return;
    this.webSocketService.connectToWebsite(this.currentUrl);
  }

  onContentClick(event: MouseEvent) {
    const rect = this.content.nativeElement.getBoundingClientRect();

    // Compute relative coordinates (0-based within the screenshot)
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    console.log('Clicked at:', x, y);

    // Send coordinates to the backend
    this.webSocketService.clickAt(x, y);
  }
}
