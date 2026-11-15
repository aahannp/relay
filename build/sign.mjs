// electron-builder signs the app with this. macOS ties Files and Folders permissions to the app's signature
// ("designated requirement"). Ad-hoc, that is the build's hash, so every update looks like a new app and loses them.
// With RELAY_SIGN_IDENTITY (a certificate's SHA-1, see .github/workflows/release.yml) every build gets the same one.
// electron-builder only takes certificates macOS trusts, so a self-signed one is passed to osx-sign directly here.
import { signAsync } from '@electron/osx-sign';

const { RELAY_SIGN_IDENTITY: identity, RELAY_SIGN_KEYCHAIN: keychain } = process.env;
export default opts => signAsync(identity ? { ...opts, identity, keychain } : opts);
