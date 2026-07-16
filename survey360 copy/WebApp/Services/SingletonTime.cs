namespace WebApp.Services;

public class SingletonTime
{
    private readonly DateTime _time = DateTime.Now;
    
    public string GetTime()
    {
        return _time.ToString("ddd dd MMMM yyyy HH:mm:ss.fffffff");
    }
}
