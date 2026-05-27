import { Linking, Alert } from 'react-native';

// Only http(s) links should ever be opened from server-supplied data (content links,
// PDF/drive URLs, etc). Blocks javascript:/intent:/file:/tel:/custom-scheme payloads
// that a compromised or malicious API response could otherwise use to trigger unwanted
// native behavior when a user taps a "view" button.
export async function openSafeUrl(url: string | undefined | null): Promise<void> {
  if (!url || typeof url !== 'string') {
    Alert.alert('Unavailable', 'No link was provided for this item.');
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    Alert.alert('Invalid Link', 'This link could not be opened.');
    return;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    Alert.alert('Invalid Link', 'This link could not be opened.');
    return;
  }

  try {
    await Linking.openURL(parsed.toString());
  } catch {
    Alert.alert('Error', 'Could not open this link.');
  }
}
