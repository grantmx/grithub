

export default function useExportBreadcrumbPath(){
    
    function buildPath(customPath, routerAsPath){
        const restrictedPaths = ["c", "p", "l"]

        const linkPath = customPath ? customPath.split('/') : routerAsPath.split('/');
        linkPath.shift();

        const pathArray = linkPath.map((path, i) => {
            if (restrictedPaths.find(item => path === item)) {
                return;
            }

            return {
                breadcrumb: path,
                href: '/' + linkPath.slice(0, i + 1).join('/'),
            };

        }).filter(item => typeof item !== "undefined")


        return pathArray;
    }


    return{
        buildPath
    }

}