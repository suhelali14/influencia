import { useState, useCallback } from 'react'
import { fetchApi, FetchApiError } from '../lib/fetchApi'

export interface UseApiOptions {
  immediate?: boolean
}

export interface UseApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export function useApi<T>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  })

  const execute = useCallback(async (
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    endpoint: string,
    payload?: any,
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      let result: T
      
      switch (method) {
        case 'get':
          result = await fetchApi.get<T>(endpoint, payload)
          break
        case 'post':
          result = await fetchApi.post<T>(endpoint, payload)
          break
        case 'put':
          result = await fetchApi.put<T>(endpoint, payload)
          break
        case 'patch':
          result = await fetchApi.patch<T>(endpoint, payload)
          break
        case 'delete':
          result = await fetchApi.delete<T>(endpoint)
          break
      }
      
      setState({ data: result, loading: false, error: null })
      return result
    } catch (error) {
      const message = error instanceof FetchApiError 
        ? error.message 
        : 'An unexpected error occurred'
      
      setState(prev => ({ ...prev, loading: false, error: message }))
      throw error
    }
  }, [])

  const get = useCallback((endpoint: string, params?: Record<string, any>) => 
    execute('get', endpoint, params), [execute])
  
  const post = useCallback((endpoint: string, data?: any) => 
    execute('post', endpoint, data), [execute])
  
  const put = useCallback((endpoint: string, data?: any) => 
    execute('put', endpoint, data), [execute])
  
  const patch = useCallback((endpoint: string, data?: any) => 
    execute('patch', endpoint, data), [execute])
  
  const del = useCallback((endpoint: string) => 
    execute('delete', endpoint), [execute])

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null })
  }, [])

  return {
    ...state,
    get,
    post,
    put,
    patch,
    delete: del,
    reset,
  }
}

/**
 * Hook for fetching data on mount
 */
export function useFetch<T>(endpoint: string, params?: Record<string, any>) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await fetchApi.get<T>(endpoint, params)
      setData(result)
    } catch (err) {
      const message = err instanceof FetchApiError 
        ? err.message 
        : 'Failed to fetch data'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [endpoint, JSON.stringify(params)])

  return { data, loading, error, refetch }
}

export default useApi
