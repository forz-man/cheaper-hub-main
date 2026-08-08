export function getSharedInitial(profile, user) {
  const name = profile?.full_name || profile?.fullName || user?.user_metadata?.full_name || '';
  if (name && name.trim()) return name.trim().charAt(0).toUpperCase();

  const email = profile?.email || user?.email || '';
  if (email && email.trim()) return email.trim().charAt(0).toUpperCase();

  return 'U';
}

export function getUserInitial(profile, user) {
  return getSharedInitial(profile, user);
}
