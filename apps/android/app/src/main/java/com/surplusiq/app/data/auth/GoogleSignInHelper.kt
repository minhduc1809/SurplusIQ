package com.surplusiq.app.data.auth

import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.surplusiq.app.BuildConfig

/**
 * Sign-in with Google via Credential Manager (modern androidx API, not the
 * deprecated GoogleSignInClient/play-services-auth API).
 */
object GoogleSignInHelper {

    /**
     * Launches the Credential Manager Google sign-in flow and returns the Google ID token.
     * Throws androidx.credentials.exceptions.GetCredentialException on cancel/failure —
     * callers should catch it and show a friendly error.
     */
    suspend fun requestIdToken(context: Context): String {
        val option = GetSignInWithGoogleOption.Builder(BuildConfig.GOOGLE_SERVER_CLIENT_ID).build()
        val request = GetCredentialRequest.Builder()
            .addCredentialOption(option)
            .build()

        val credentialManager = CredentialManager.create(context)
        val result = credentialManager.getCredential(context, request)
        val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(result.credential.data)
        return googleIdTokenCredential.idToken
    }
}
