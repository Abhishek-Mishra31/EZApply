interface JobCard {
    card: Element;
    clickable: Element;
    title: string;
}
interface Config {
    delayBetweenJobs: number;
    maxRetries: number;
    jobCardSelector: string;
    jobTitleSelector: string;
    jobDetailsPanel: string;
    jobDetailsContent: string;
    easyApplyButtonSelector: string;
    applicationModalSelector: string;
    appliedIndicator: string;
}
interface MessageRequest {
    action: string;
    [key: string]: any;
}
interface MessageResponse {
    success?: boolean;
    message?: string;
    status?: string;
    isRunning?: boolean;
    totalApplied?: number;
    currentPage?: number;
}
interface Window {
    __LINKEDIN_AUTO_APPLY_RUNNING: boolean;
}
