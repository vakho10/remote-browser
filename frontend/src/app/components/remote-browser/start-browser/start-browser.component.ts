import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Router } from "@angular/router";
import { interval, Subscription } from "rxjs";
import { WebSocketService } from "../../../services/websocket.service";

@Component({
    selector: 'app-start-browser',
    standalone: true,
    imports: [],
    templateUrl: './start-browser.component.html',
    styleUrl: './start-browser.component.scss'
})
export class StartBrowserComponent implements OnInit, OnDestroy {
    webSocketService = inject(WebSocketService);
    router = inject(Router);

    isLoading = false;
    private statusSub?: Subscription;
    private pollSub?: Subscription;

    ngOnInit() {
        this.webSocketService.activate();

        this.statusSub = this.webSocketService.browserStatusSubject.subscribe(status => {
            if (status.alive) {
                this.statusSub?.unsubscribe();
                this.router.navigate(['/browser']);
            }
        });

        // Poll for status immediately in case it's already running
        this.checkStatus();
    }

    ngOnDestroy() {
        this.statusSub?.unsubscribe();
        this.pollSub?.unsubscribe();
    }

    startBrowser() {
        this.isLoading = true;
        this.webSocketService.startBrowser();

        // Start polling for status
        this.pollSub = interval(1000).subscribe(() => {
            this.checkStatus();
        });
    }

    checkStatus() {
        this.webSocketService.checkBrowserStatus();
    }
}
