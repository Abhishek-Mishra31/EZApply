interface MessageRequest {
    action: string;
}
interface MessageResponse {
    success?: boolean;
    error?: any;
    [key: string]: any;
}
interface ContentScriptResult {
    processApplication?: () => void;
    answerQuestionsOnPage?: () => void;
    userData?: any;
}
declare function getContentScriptFunctions(): ContentScriptResult;
declare const JOBS_URL_PREFIX: string;
declare function updateActionState(tab: chrome.tabs.Tab): void;
