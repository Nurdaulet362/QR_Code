FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY out/ .
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "QR_Code.dll"]
