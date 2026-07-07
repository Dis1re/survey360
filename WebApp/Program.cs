using Microsoft.EntityFrameworkCore;
using WebApp.Data;
using WebApp.Services;

var builder = WebApplication.CreateBuilder(args);

// Добавление служб в DI

// Настройка подключения в БД, по умолчанию используется Sqlite
var connectionString = builder.Configuration.GetConnectionString("SqliteConnection");
builder.Services.AddDbContextPool<ApplicationDbContext>(options => options.UseSqlite(connectionString));

/*
 * Пример подключения PostgreSQL
var connectionString = builder.Configuration.GetConnectionString("PostgresConnection");
builder.Services.AddDbContextPool<ApplicationDbContext>(options => options.UseNpgsql(connectionString));
*/

// Добавление своих настроек
var mySettingsSection = builder.Configuration.GetSection("MySettings");
builder.Services.Configure<MySettings>(mySettingsSection);

// Примеры добавления сервисов с разным жизненным циклом
// Посмотреть можно тут https://localhost:7126/services
builder.Services.AddTransient<TransientTime>();
builder.Services.AddScoped<ScopedTime>();
builder.Services.AddSingleton<SingletonTime>();

// Добавление Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddControllersWithViews();

var app = builder.Build();

// Применение миграций при старте
// Можно удалить, если миграции будут применяться до запуска сайта
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    await db.Database.MigrateAsync();
}

// Настройка pipeline обработки запроса
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}
else
{
    /*
     * Добавляет swagger по пути https://localhost:7126/swagger
     * Там можно вызывать api и смотреть результат
     */
    app.UseSwagger();
    app.UseSwaggerUI();
}

    app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.MapControllerRoute(
    name: "default",
    pattern: "/{controller=Home}/{action=Index}/{id?}");

app.Run();
