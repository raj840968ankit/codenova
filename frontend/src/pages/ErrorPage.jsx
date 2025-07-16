import { NavLink, useNavigate, useRouteError } from "react-router-dom"

export const ErrorPage = () => {
    //! This hook is used to go get error details
    const error = useRouteError();

    //! This hook is used to go back from error page
    const navigate = useNavigate()

    const handleGoBack = () => {
        navigate(-1);  //?this means 1 page before
    }

    if (error.status === 404) {
        return (
            <section className=" error-section">
                <div id="error-text">
                    <figure className="error-image-container">
                        <img
                            src="https://cdn.dribbble.com/users/722246/screenshots/3066818/404-page.gif"
                            alt="404 page"
                            className="error-image"
                        />
                    </figure>
                    <div className="text-content">
                        <p className="message-a">
                            The page you were looking for could not be found
                        </p>
                        <p className="message-b">... Back to previous page</p>

                        <button 
                            onClick={handleGoBack}
                            style={{marginRight : "5px"}}
                        >
                            Click to go back
                        </button>

                        <NavLink to={'/'}>
                            <button>Click for Home Page</button>
                        </NavLink>
                    </div>
                </div>
            </section>
        )
    }

    return <h1>404 Error Page - Page Not Found</h1>
}