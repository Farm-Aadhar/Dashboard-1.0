# Weather API Usage Optimization

## 🎯 **Goal: Stay Under 800 API Calls Per Day**

Your OpenWeatherMap free plan allows 1,000 calls/day, but we've implemented intelligent limiting to stay well under 800 calls to ensure reliable operation.

## 🛡️ **API Protection Features**

### 1. **Smart Rate Limiting**
- **Daily Limit**: 750 calls (configurable via `.env`)
- **Minimum Interval**: 60 seconds between calls
- **Automatic Blocking**: Prevents exceeding limits
- **Counter Reset**: Automatically resets every 24 hours

### 2. **Intelligent Caching**
- **Cache Duration**: 15 minutes (900 seconds)
- **Memory Storage**: Reduces repeated API calls
- **Expired Cache Fallback**: Uses old data if API limit reached
- **Location-Based Keys**: Separate cache for different coordinates

### 3. **Usage Monitoring**
- **Real-Time Tracking**: Live API call counter
- **Visual Dashboard**: Progress bars and usage statistics
- **Alerts**: Warnings when approaching limits
- **Development Tools**: Cache clearing and counter reset

## 📊 **Expected Daily Usage**

With current implementation:
- **Weather Widget**: ~48 calls/day (every 15 minutes during 12-hour active period)
- **Sensor Validation**: ~24 calls/day (when validation runs)
- **Manual Refreshes**: ~10 calls/day (user interactions)
- **Buffer for Testing**: ~50 calls/day
- **Total Expected**: ~130-150 calls/day ✅

## ⚙️ **Configuration Options**

Your `.env` file now includes:

```env
# Weather API Limits (Stay under 1000 calls/day)
VITE_WEATHER_MAX_CALLS_PER_DAY=750          # Daily limit
VITE_WEATHER_CACHE_TIMEOUT=900000           # Cache for 15 minutes
VITE_WEATHER_MIN_CALL_INTERVAL=60000        # Wait 1 minute between calls
```

## 🔧 **Development Tools Available**

1. **Weather API Monitor** (Development Mode)
   - Real-time usage tracking
   - Cache size monitoring
   - Manual cache clearing
   - Counter reset (testing only)

2. **Smart Caching System**
   - Automatic cache management
   - Graceful degradation when limits reached
   - Location-based cache keys
   - Expired data fallback

## 📈 **Usage Optimization Strategies**

### ✅ **Implemented**
- 15-minute cache reduces calls by 90%
- Minimum 1-minute intervals prevent spam
- Automatic fallback to cached data
- Smart counter with daily reset
- Development vs production limits

### 🎯 **Best Practices**
- Weather data refreshes automatically every 15 minutes
- Manual refreshes respect rate limits
- Sensor validation uses cached weather when possible
- Development tools help monitor usage
- Graceful error handling when limits reached

## 🚨 **Limit Protection**

### If Approaching Limit (>90% usage):
- Shows warning in API monitor
- Blocks new API calls
- Falls back to cached data (even if expired)
- Continues operation with last known weather

### If Limit Exceeded:
- All new calls blocked until reset
- Uses last cached data
- Shows appropriate error messages
- Automatic recovery after 24-hour reset

## 🧪 **Testing Without Consuming API Calls**

During development, you can:
1. Use cached data for repeated tests
2. Clear cache only when needed
3. Reset counter for testing (development only)
4. Monitor real-time usage
5. Test limit scenarios safely

## 📱 **Production Recommendations**

1. **Monitor Usage**: Check the API monitor regularly
2. **Adjust Cache Time**: Increase if needed (currently 15 minutes)
3. **User Education**: Inform users about refresh limits
4. **Fallback Strategy**: Always have cached data available
5. **Upgrade Plan**: Consider paid plan if usage grows

Your system is now optimized to stay comfortably under 800 API calls per day while providing reliable weather data for your Farm Insight Garden! 🌱
