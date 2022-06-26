import {builder, HttpClient, HttpHeaders} from 'igottp';

interface CredentialTypes {

    authToken: string | null;

};

const credentials : CredentialTypes = { authToken: null };

export const setToken = (token: string) => credentials.authToken = token;

const headerSetter = (headers:any) => {
    if (credentials.authToken)
        headers[HttpHeaders.AUTHORIZATION] = 'Bearer ' + credentials.authToken;
};

const responseHeaders = (_headers:any) => {

};

export const defaultClient: HttpClient = builder()
    .withType('json')
    .withAcceptType('json')
    .build();

export const withAuthClient: HttpClient = builder()
    .withHeaderSetCallback(headerSetter)
    .withResponseHeadersCallback(responseHeaders)
    .withType('json')
    .withAcceptType('json')
    .build();
