import { User, UserRole, Store, UserStatus } from '../types'
import { mapRawUserToUser, RawUser } from './userProfile'

export type CreateUserPayload = {
  name: string
  email: string
  password: string
  role: UserRole
  sites: string[]
  departments: Store[]
  status?: UserStatus
}

export const createUserViaFunction = async (
  payload: CreateUserPayload
): Promise<{ user: User | null; error: string | null }> => {
  const endpoint =
    import.meta.env.VITE_CREATE_USER_ENDPOINT ?? '/api/create-user'

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const contentType = response.headers.get('Content-Type') ?? ''
    const isJson = contentType.includes('application/json')
    const body = isJson ? await response.json() : null

    if (!response.ok) {
      const message = body?.error ?? `Failed to create user (status ${response.status})`
      return { user: null, error: message }
    }

    const mapped = mapRawUserToUser(body as RawUser)
    return { user: mapped, error: mapped ? null : 'Failed to map created user profile' }
  } catch (error) {
    return {
      user: null,
      error: error instanceof Error ? error.message : 'Failed to create user',
    }
  }
}

export const updateUserProfile = async (
  id: string,
  updates: Partial<Omit<CreateUserPayload, 'password'>> & { status?: UserStatus }
): Promise<{ error: string | null; user: User | null }> => {
  const updateEndpoint =
    import.meta.env.VITE_UPDATE_USER_ENDPOINT ?? '/api/update-user';

  try {
    const response = await fetch(updateEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id,
        ...updates,
      }),
    });

    const contentType = response.headers.get('Content-Type') ?? '';
    const isJson = contentType.includes('application/json');
    const result = isJson ? await response.json() : null;

    if (!response.ok) {
      return {
        error:
          result && typeof result.error === 'string'
            ? result.error
            : `Failed to update user profile (status ${response.status})`,
        user: null,
      };
    }

    const mapped = result ? mapRawUserToUser(result as RawUser) : null;
    if (!mapped) {
      return { error: 'Failed to map updated user', user: null };
    }

    return { error: null, user: mapped };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to update user profile',
      user: null,
    };
  }
}

