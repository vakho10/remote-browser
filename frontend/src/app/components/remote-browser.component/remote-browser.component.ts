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

  private wheelSub?: Subscription;
  private imageSub?: Subscription;

  @ViewChild('overlay', {static: true})
  overlay!: ElementRef<HTMLDivElement>;

  @ViewChild('screenCanvas', {static: true})
  canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;

  history: string[] = [];
  currentIndex = -1;

  ngOnInit() {
    this.webSocketService.activate();

    // Observe ONLY overlay — it defines logical size of remote screen
    this.resizeObserver = new ResizeObserver(entries => {
      entries.forEach(entry => this.resizeSubject.next(entry));
    });

    this.resizeObserver.observe(this.overlay.nativeElement);

    // Send resize only after user stops resizing
    this.resizeSubject.pipe(debounceTime(200)).subscribe(entry => {
      const rect = entry.contentRect;

      this.webSocketService.resizeTo(rect.width, rect.height);

      // Match canvas pixel dimensions to overlay size
      this.resizeCanvasToOverlay();
    });
  }

  ngAfterViewInit() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;

    // Initial sync
    this.resizeCanvasToOverlay();

    // Listen for images
    this.imageSub = this.webSocketService.imageSubject.subscribe(base64 => {
      if (!base64) return;
      this.drawImage(base64);
    });

    // Scroll events throttle
    this.wheelSub = fromEvent<WheelEvent>(this.canvasRef.nativeElement, 'wheel')
      .pipe(throttleTime(100))
      .subscribe(e => {
        e.preventDefault();
        if (e.deltaY < 0) this.webSocketService.scrollUp();
        else this.webSocketService.scrollDown();
      });
  }

  ngOnDestroy() {
    this.webSocketService.deactivate();
    this.resizeObserver?.disconnect();
    this.resizeSubject.complete();
    this.wheelSub?.unsubscribe();
    this.imageSub?.unsubscribe();
  }

  /** Always resize canvas pixel size to overlay size */
  private resizeCanvasToOverlay() {
    const canvas = this.canvasRef.nativeElement;
    const rect = this.overlay.nativeElement.getBoundingClientRect();

    // pixel buffer
    canvas.width = rect.width;
    canvas.height = rect.height;

    // match visual size exactly
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
  }

  /** Draw screenshot into canvas with background-size: contain behavior */
  private drawImage(base64: string) {
    const img = new Image();
    img.src = "data:image/png;base64," + base64;

    img.onload = () => {
      const canvas = this.canvasRef.nativeElement;
      const ctx = this.ctx;

      const cw = canvas.width;
      const ch = canvas.height;
      const iw = img.width;
      const ih = img.height;

      ctx.clearRect(0, 0, cw, ch);

      // aspect ratios
      const canvasRatio = cw / ch;
      const imageRatio = iw / ih;

      let w, h, x, y;

      if (imageRatio > canvasRatio) {
        w = cw;
        h = cw / imageRatio;
        x = 0;
        y = (ch - h) / 2;
      } else {
        h = ch;
        w = ch * imageRatio;
        y = 0;
        x = (cw - w) / 2;
      }

      ctx.drawImage(img, x, y, w, h);
    };
  }

  connectToWebsite() {
    if (this.inputFieldUrl) {
      // Trim any "forward" history if user navigates after going back
      this.history = this.history.slice(0, this.currentIndex + 1);

      // Add new URL
      this.history.push(this.inputFieldUrl);
      this.currentIndex++;

      this.currentUrl = this.inputFieldUrl;
      this.webSocketService.connectToWebsite(this.inputFieldUrl);
    }
  }

  refreshPage() {
    if (this.currentUrl) {
      this.webSocketService.connectToWebsite(this.currentUrl);
    }
  }

  goBack() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.currentUrl = this.history[this.currentIndex];
      this.inputFieldUrl = this.currentUrl;
      this.webSocketService.connectToWebsite(this.currentUrl);
    }
  }

  goForward() {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      this.currentUrl = this.history[this.currentIndex];
      this.inputFieldUrl = this.currentUrl;
      this.webSocketService.connectToWebsite(this.currentUrl);
    }
  }

  onMouseClick(event: MouseEvent) {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.webSocketService.clickAt(
      event.clientX - rect.left,
      event.clientY - rect.top
    );
  }
}
