# Stale-While-Revalidate (SWR) Caching Migration Guide

## Overview

Your ApiService now implements a **stale-while-revalidate** caching strategy that:
- ✅ Shows cached data **instantly** (no loading spinners on return visits)
- ✅ Fetches fresh data in the **background**
- ✅ Updates UI automatically when fresh data arrives
- ✅ Invalidates caches after mutations (booking, deleting, etc.)
- ✅ Removes all cache-busting timestamps (`?t=${Date.now()}`)

## Key Concepts

### Stale Time
The duration (in milliseconds) before cached data is considered "stale":
- **0ms**: Always revalidate (fetch fresh data in background every time)
- **30s**: Data is fresh for 30 seconds, then revalidates
- **2min**: Data is fresh for 2 minutes, then revalidates
- **10min**: Data is fresh for 10 minutes, then revalidates

### How It Works
1. **First call**: No cache → Shows loading → Fetches data → Caches it
2. **Second call (within stale time)**: Returns cached data instantly (no loading)
3. **Third call (after stale time)**: Returns cached data instantly → Fetches fresh data in background → Calls `onRevalidate` callback when fresh data arrives

## Updated API Methods

### ✅ Already Migrated to SWR

| Method | Stale Time | Usage |
|--------|-----------|-------|
| `getMyBookings(onRevalidate?)` | **0s** | Always revalidate - critical real-time data |
| `getBookingDetails(id, billing?, onRevalidate?)` | **0s** | Always revalidate - booking status changes |
| `getHistory(page, limit, type?, onRevalidate?)` | **0s** | Always revalidate - history updates frequently |
| `getParkingHistory(page, limit, status?, onRevalidate?)` | **0s** | Always revalidate - parking sessions change |
| `getPaymentHistory(page, limit, type?, onRevalidate?)` | **0s** | Always revalidate - payment records |
| `getVehicles(onRevalidate?)` | **2min** | Vehicles don't change often |
| `getFrequentSpots(limit?, onRevalidate?)` | **2min** | Frequent spots are relatively stable |
| `getFavorites(onRevalidate?)` | **2min** | Favorites list changes occasionally |

### 🔄 Auto Cache Invalidation

These mutations **automatically invalidate** related caches:

| Mutation | Invalidates |
|----------|-------------|
| `bookParkingSpot()` | `/parking-areas/my-bookings`, `/history`, frequent spots |
| `endParkingSession()` | `/parking-areas/my-bookings`, `/history`, frequent spots |
| `addVehicle()` | `/vehicles` |
| `deleteVehicle()` | `/vehicles` |
| `addFavorite()` | `/favorites` |
| `removeFavorite()` | `/favorites` |
| `deleteHistoryRecord()` | `/history` |

### 📋 Methods to Consider Migrating

These methods still use the old caching system. Recommended stale times:

| Method | Current | Recommended Stale Time | Priority |
|--------|---------|----------------------|----------|
| `getParkingSpotsStatus(areaId)` | No cache | **30s** | High - frequently polled |
| `getActiveSession()` | No cache | **0s** (always revalidate) | High - real-time data |
| `getParkingAreas()` | 5min cache | **10min** | Medium - rarely changes |
| `getSubscriptionPlans()` | No cache | **10min** | Low - static data |
| `getSubscriptionBalance()` | No cache | **2min** | Medium - changes with usage |
| `getBalance()` | No cache | **2min** | Medium - payment balance |

## Migration Examples

### Example 1: Migrate `getParkingSpotsStatus` to SWR

**Before:**
```typescript
static async getParkingSpotsStatus(areaId: number) {
  return this.request<{...}>(`/parking-areas/areas/${areaId}/spots-status`);
}
```

**After:**
```typescript
static async getParkingSpotsStatus(areaId: number, onRevalidate?: (data: any) => void) {
  return this.requestWithRevalidate<{
    success: boolean;
    data: {
      spots: Array<{...}>;
    };
  }>(`/parking-areas/areas/${areaId}/spots-status`, {}, 30000, onRevalidate); // 30s stale time
}
```

### Example 2: Migrate `getActiveSession` to SWR

**Before:**
```typescript
static async getActiveSession() {
  return this.request<{...}>('/parking/active');
}
```

**After:**
```typescript
static async getActiveSession(onRevalidate?: (data: any) => void) {
  return this.requestWithRevalidate<{
    success: boolean;
    data: {
      session: {...} | null;
    };
  }>('/parking/active', {}, 0, onRevalidate); // 0s = always revalidate
}
```

## Component Usage Patterns

### Pattern 1: Basic SWR with Revalidation Callback

```typescript
const [data, setData] = useState([]);
const [isLoading, setIsLoading] = useState(true);

const loadData = async () => {
  try {
    const response = await ApiService.getParkingHistory(
      1, 
      20, 
      undefined,
      (freshData) => {
        // Called when background fetch completes
        if (freshData.success) {
          setData(freshData.data.sessions);
        }
      }
    );
    
    // Initial data (from cache or fresh)
    if (response.success) {
      setData(response.data.sessions);
    }
  } finally {
    setIsLoading(false);
  }
};

useFocusEffect(useCallback(() => {
  loadData();
}, []));
```

### Pattern 2: Pull-to-Refresh with Force Refresh

```typescript
const [isRefreshing, setIsRefreshing] = useState(false);

const handleRefresh = async () => {
  setIsRefreshing(true);
  try {
    const response = await ApiService.forceRefresh<any>(
      '/history/parking?page=1&limit=20'
    );
    if (response.success) {
      setData(response.data.sessions);
    }
  } finally {
    setIsRefreshing(false);
  }
};

return (
  <FlatList
    data={data}
    refreshControl={
      <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
    }
  />
);
```

### Pattern 3: Real-time Polling with SWR

```typescript
const loadBooking = async () => {
  const response = await ApiService.getMyBookings((freshData) => {
    if (freshData.success) {
      setBookingData(freshData.data.bookings[0]);
    }
  });
  
  if (response.success) {
    setBookingData(response.data.bookings[0]);
  }
};

// Poll every 10 seconds
useEffect(() => {
  loadBooking();
  const interval = setInterval(loadBooking, 10000);
  return () => clearInterval(interval);
}, []);
```

## Benefits

### Before SWR
- ❌ Every navigation shows loading spinner
- ❌ Cache-busting timestamps prevent any caching
- ❌ Slow perceived performance
- ❌ Manual cache invalidation required
- ❌ Stale data on return visits

### After SWR
- ✅ Instant data display from cache
- ✅ Fresh data loads in background
- ✅ UI updates automatically when fresh data arrives
- ✅ Automatic cache invalidation after mutations
- ✅ Configurable stale times per endpoint
- ✅ Pull-to-refresh support
- ✅ No more loading spinners on cached data

## Testing Checklist

- [ ] History screen shows cached data instantly on second visit
- [ ] Pull-to-refresh fetches fresh data
- [ ] After booking, history updates automatically
- [ ] After ending session, booking list updates
- [ ] Vehicles list shows cached data on return
- [ ] Frequent spots update in background
- [ ] Favorites update after add/remove
- [ ] No `?t=` timestamps in network requests
- [ ] Background revalidation completes without blocking UI

## Advanced: Manual Cache Control

### Invalidate Specific Cache
```typescript
ApiService.invalidateSWRCache('/parking-areas/my-bookings');
```

### Clear All Caches
```typescript
ApiService.clearCache();
```

### Force Refresh (Bypass Cache)
```typescript
const freshData = await ApiService.forceRefresh('/vehicles');
```

## Migration Priority

1. **High Priority** (Do First):
   - `getParkingSpotsStatus` - Frequently polled, needs 30s stale time
   - `getActiveSession` - Real-time data, needs 0s stale time

2. **Medium Priority**:
   - `getBalance` - Payment balance, 2min stale time
   - `getSubscriptionBalance` - Subscription info, 2min stale time

3. **Low Priority**:
   - `getParkingAreas` - Static data, 10min stale time
   - `getSubscriptionPlans` - Rarely changes, 10min stale time

## Troubleshooting

### Issue: Data not updating after mutation
**Solution**: Check that the mutation method calls `invalidateSWRCache()` for the correct endpoint.

### Issue: Seeing stale data
**Solution**: Use `forceRefresh()` or reduce the stale time for that endpoint.

### Issue: Too many network requests
**Solution**: Increase the stale time for that endpoint.

### Issue: Callback not firing
**Solution**: Ensure you're passing the `onRevalidate` callback and that the data is actually stale (past stale time).

## Summary

Your app now has a production-ready SWR caching system that:
- Eliminates loading spinners for cached data
- Keeps data fresh in the background
- Automatically invalidates caches after mutations
- Provides pull-to-refresh support
- Improves perceived performance dramatically

Next steps: Migrate the remaining high-priority methods and test thoroughly!
