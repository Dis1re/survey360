namespace WebApp.Models;

public class UserGroup
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string UserIds { get; set; } = "[]";
    public int CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; }
}
