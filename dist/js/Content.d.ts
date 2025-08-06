interface UserData {
    personalInfo: {
        fullName: string;
        email: string;
        phone: string;
        linkedin: string;
        location: string;
        pronouns?: string;
        countryOfResidence?: string;
    };
    jobPreferences: {
        expectedCTC: string;
        totalITExperience: string;
        totalMonthsExperience: string;
        currentSalary: string;
        servingNoticePeriod: string;
        currentlyWorking?: boolean;
        immediateJoiner?: boolean;
        noticePeriod?: string;
        hybridWork?: boolean;
        commuteToLocation?: boolean;
        skillRatings?: {
            [key: string]: string;
        };
        technologies?: {
            [key: string]: boolean;
        };
        willingToRelocate?: boolean;
        workAuthorization?: string;
        totalExperience?: string;
        expectedSalary?: string;
    };
    educationAndInternships: {
        hasBachelorsDegree: boolean;
    };
    education?: {
        gpa: string;
        graduationDate: string;
        currentlyEnrolled: boolean;
    };
    documentsAndLinks: {
        resumeURL: string;
        coverLetter: string;
        portfolioURL: string;
        personalWebsite: string;
    };
    assessmentsAndSkills: {
        githubURL: string;
        leetcodeURL: string;
    };
    behavioralAndMotivation: {
        strengths: string;
        weaknesses: string;
    };
    legalAndWorkAuth: {
        authorizedToWorkIn: string;
        visaType: string;
        needSponsorship: string;
    };
    availability: {
        startDate: string;
    };
    extraAndOptional: {
        openToRemoteWork: boolean;
        lookingForInternship: boolean;
        unpaidInternshipComfort: string;
        skillRatings?: {
            [key: string]: string;
        };
        driversLicense?: boolean;
        passportAvailability?: boolean;
        requireAccommodations?: boolean;
        openToContract?: boolean;
        wantsMentoring?: boolean;
        keywordMappings?: {
            driversLicense: string;
        };
    };
    workExperiences: Array<{
        duration: string;
        description?: string;
        startDate?: string;
        endDate?: string;
        [key: string]: any;
    }>;
    skills?: {
        [key: string]: any;
    };
    keywords?: {
        [key: string]: any;
    };
}
interface QuestionMapping {
    [key: string]: string;
}
interface MessageRequest {
    action: string;
}
