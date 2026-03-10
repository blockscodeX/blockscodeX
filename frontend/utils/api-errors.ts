export class FeatureDisabledError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'FeatureDisabledError';
    }
}


export async function handleApiResponse(response: Response) {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));

        if (response.status === 403) {
            throw new FeatureDisabledError(errorData.message || 'This feature is disabled for your organization.');
        }

        throw new Error(errorData.message || `Request failed with status ${response.status}`);
    }

    return response.json();
}
